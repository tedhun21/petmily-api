module.exports = (plugin) => {
  // 회원정보 조회
  plugin.controllers.user.me = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("로그인 해주세요.");
    }
    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          populate: {
            photo: true,
            role: { fields: ["type"] },
          },
        }
      );

      const modifiedUser = {
        memberId: user.id,
        email: user.email,
        name: user.username,
        nickName: user.nickName,
        phone: user.phone,
        address: user.address,
        photo: user.photo,
        body: user.body,
        petsitterBoolean: user.role.type === "petsitter" ? true : false,
      };

      ctx.send(modifiedUser);
    } catch (e) {
      console.log(e);
    }
  };

  // 펫시터 1인 조회
  plugin.controllers.user.petsitter = async (ctx) => {
    try {
      const petsitter = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.params.id,
        {
          populate: {
            photo: true,
            role: { fields: ["type"] },
          },
        }
      );

      const reviews = await strapi.entityService.findPage(
        "api::review.review",
        {
          filters: {
            reservation: { petsitter: { id: { $eq: +ctx.params.id } } },
          },
        }
      );

      const modifiedPetsitter = {
        petsitterId: petsitter.id,
        email: petsitter.email,
        name: petsitter.username,
        nickName: petsitter.nickName,
        phone: petsitter.phone,
        address: petsitter.address,
        photo: petsitter.photo.formats.thumbnail.url,
        possiblePetType: petsitter.possiblePetType,
        possibleLocation: petsitter.possibleLocation
          ? petsitter.possibleLocation
          : null,
        possibleDay: petsitter.possibleDay ? petsitter.possibleDay : null,
        possibleTimeStart: petsitter.possibleTimeStart,
        possibleTimeEnd: petsitter.possibleTimeEnd,
        body: petsitter.body ? petsitter.body : null,
        star:
          Math.ceil(
            (reviews.results
              .map((review) => review.star)
              .reduce((acc, cur) => acc + cur) /
              reviews.results.length) *
              10
          ) / 10,
        reviewCount: reviews.pagination.total,
      };
      ctx.send(modifiedPetsitter);
    } catch (e) {
      console.error(e);
    }
  };

  // 회원정보 등록
  plugin.controllers.auth.register = async (ctx) => {
    const { provider } = ctx.request.body;

    try {
      const newMember = await strapi.entityService.create(
        "plugin::users-permissions.user",
        {
          data: {
            ...ctx.request.body,
            username: ctx.request.body.name,
            provider: provider || "local",
            role: {
              connect: [ctx.request.body.petsitterBoolean ? 3 : 2],
            },
          },
        }
      );

      ctx.send({ data: "success create member" });
    } catch (e) {
      console.log(e);
    }
  };

  // 회원정보 수정
  plugin.controllers.user.update = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("권한이 없습니다.");
    } else if (ctx.state.user.id === +ctx.params.id) {
      console.log(ctx.request.body);

      const updatedUser = await strapi.entityService.update(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          data: {
            ...ctx.request.body,
          },
        }
      );

      ctx.send({ data: "success modify member" });
    }
  };

  // 회원정보 삭제
  plugin.controllers.user.destroy = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("권한이 없습니다.");
    } else if (ctx.state.user.id === +ctx.params.id) {
      try {
        const deleteUser = await strapi.entityService.delete(
          "plugin::users-permissions.user",
          ctx.state.user.id
        );
        ctx.send({ data: "success delete member" });
      } catch (e) {
        console.log(e);
      }
    }
  };

  plugin.controllers.petsitter = plugin.controllers.petsitter || {};

  // 펫시터 프로필 조회
  plugin.controllers.petsitter.me = async (ctx) => {
    try {
      if (!ctx.state.user) {
        return ctx.badRequest("로그인 해주세요.");
      }

      const isPetsitter = ctx.state.user.role.type === "petsitter";

      if (!isPetsitter) {
        return ctx.badRequest(
          "You are not authorized to access this resource."
        );
      }

      const petsitterInfo = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id
      );

      // 리뷰 카운트
      const reviews = await strapi.entityService.findPage(
        "api::review.review",
        {
          filters: {
            reservation: { petsitter: { id: { $eq: ctx.state.user.id } } },
          },
        }
      );

      // 월 예약 카운트
      const thisMonthReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          filters: {
            reservationDate: {
              $lte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1
              )
                .toISOString()
                .substring(0, 10),
              $gt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                .toISOString()
                .substring(0, 10),
            },
          },
        }
      );

      // 주 예약 카운트
      const thisWeekReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          filters: {
            reservationDate: {
              $lte: new Date(
                new Date().setDate(
                  new Date().getDate() - new Date().getDay() + 5
                )
              )
                .toISOString()
                .substring(0, 10),
              $gt: new Date(
                new Date().setDate(new Date().getDate() - new Date().getDay())
              )
                .toISOString()
                .substring(0, 10),
            },
          },
        }
      );

      // 오늘 예약 카운트
      const todayReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          filters: {
            reservationDate: {
              $eq: new Date().toISOString().substring(0, 10),
            },
          },
        }
      );

      // 확정된 예약 카운트
      const confirmedReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          filters: { progress: { $eq: "RESERVATION_CONFIRMED" } },
        }
      );

      // 신청 예약 카운트
      const requestReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          filters: { progress: { $eq: "RESERVATION_REQUEST" } },
        }
      );

      const formattedPetsitterInfo = {
        petsitterId: petsitterInfo.id,
        possiblePetType: petsitterInfo.possiblePetType || "DOGCAT",
        possibleLocation: petsitterInfo.possibleLocation
          ? petsitterInfo.possibleLocation.split(",")
          : [],
        possibleDay: petsitterInfo.possibleDay,
        possibleTimeStart: petsitterInfo.possibleTimeStart,
        possibleTimeEnd: petsitterInfo.possibleTimeEnd,
        star:
          Math.ceil(
            (reviews.results
              .map((review) => review.star)
              .reduce((acc, cur) => acc + cur) /
              reviews.results.length) *
              10
          ) / 10,
        reviewCount: reviews.pagination.total,
        monthTotalReservationCount: thisMonthReservations.pagination.total,
        thisWeekReservationCount: thisWeekReservations.pagination.total,
        todayReservationCount: todayReservations.pagination.total,
        confirmedReservationCount: confirmedReservations.pagination.total,
        requestReservationCount: requestReservations.pagination.total,
      };

      ctx.send(formattedPetsitterInfo);
    } catch (error) {
      console.error(error);
      ctx.badRequest("An error occurred while fetching petsitter information.");
    }
  };

  // 펫시터 프로필 수정

  plugin.controllers.petsitter.update = async (ctx) => {
    try {
      if (!ctx.state.user) {
        return ctx.badRequest("로그인 해주세요.");
      }

      const isPetsitter = ctx.state.user.role.type === "petsitter";

      if (!isPetsitter) {
        return ctx.badRequest(
          "You are not authorized to access this resource."
        );
      }

      if (ctx.state.user.id !== +ctx.params.memberId) {
        return ctx.badRequest(
          "You are not authorized to update information for this member."
        );
      }

      const updatedPetsitterInfo = await strapi.entityService.update(
        "plugin::users-permissions.user",
        +ctx.params.memberId,
        {
          data: {
            possiblePetType: ctx.request.body.possiblePetType,
            possibleDay: ctx.request.body.possibleDay,
            possibleTimeStart: ctx.request.body.possibleTimeStart,
            possibleTimeEnd: ctx.request.body.possibleTimeEnd,
            possibleLocation: ctx.request.body.possibleLocation,
          },
        }
      );

      ctx.send("update success");
    } catch (error) {
      console.error(error);
      ctx.badRequest("An error occurred while fetching petsitter information.");
    }
  };

  // 펫시터 찜하기
  plugin.controllers.user.like = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("로그인 해주세요.");
    }

    try {
      const currentUser = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          populate: {
            likes: true,
          },
        }
      );

      if (ctx.state.user.role.type === "petsitter") {
        return ctx.badRequest("찜하기 권한이 없습니다.");
      }
      if (ctx.state.user.id === +ctx.params.id) {
        return ctx.badRequest("자신을 찜할 수 없습니다.");
      }

      const likesIndex = currentUser.likes.findIndex(
        (likes) => likes.id === +ctx.params.id
      );
      let isliked;

      if (likesIndex !== -1) {
        // 찜 목록에 있다면 찜 해제
        currentUser.likes.splice(likesIndex, 1);
        isliked = false;
      } else {
        // 찜 목록에 없다면 찜하기
        currentUser.likes.push({ id: +ctx.params.id });
        isliked = true;
      }

      // 사용자 정보 업데이트
      await strapi.entityService.update(
        "plugin::users-permissions.user",
        +ctx.state.user.id,
        {
          data: {
            likes: currentUser.likes,
          },
        }
      );

      ctx.send({ data: isliked }); // 찜 상태 반환
    } catch (e) {
      console.error(e);
    }
  };

  // 회원정보 조회 route
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/members/my-page",
    handler: "user.me",
    config: {
      prefix: "",
    },
  });

  // 펫시터 조회 route
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/members/petsitters/:id",
    handler: "user.petsitter",
    config: {
      prefix: "",
    },
  });

  // 회원정보 등록 route
  plugin.routes["content-api"].routes.push({
    method: "POST",
    path: "/auth/local/register",
    handler: "auth.register",
  });

  // 회원정보 수정 route
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/members/:id",
    handler: "user.update",
    config: {
      prefix: "",
    },
  });

  // 회원정보 삭제 route
  plugin.routes["content-api"].routes.push({
    method: "DELETE",
    path: "/members/:id",
    handler: "user.destroy",
    config: {
      prefix: "",
    },
  });

  // 펫시터 프로필 조회
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/members/petsitters",
    handler: "petsitter.me",
    config: {
      prefix: "",
    },
  });

  // 펫시터 프로필 수정
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/members/petsitters/:memberId",
    handler: "petsitter.update",
    config: {
      prefix: "",
    },
  });

  // 펫시터 찜하기 route
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/members/favorite/:id",
    handler: "user.like",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
