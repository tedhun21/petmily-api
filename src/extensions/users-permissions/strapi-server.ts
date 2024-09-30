module.exports = (plugin) => {
  // 나의 정보
  plugin.controllers.user.me = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId } = ctx.state.user;

    try {
      // 일반 유저 정보 조회
      const me = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        {
          populate: {
            photo: { fields: ["id", "url"] },
            role: { fields: ["type"] },
          },
        }
      );

      // 일반 유저 정보 조회
      if (me.role.type === "public") {
        const modifiedMe = {
          id: me.id,
          email: me.email,
          username: me.username,
          nickname: me.nickname,
          address: me.address,
          detailAddress: me.detailAddress,
          phone: me.phone,
          photo: me.photo,
          body: me.body,
          isPetsitter: false,
        };

        return ctx.send(modifiedMe);
      } else if (me.role.type === "petsitter") {
        try {
          // 리뷰 카운트
          const reviews = await strapi.entityService.findPage(
            "api::review.review",
            {
              filters: {
                reservation: { petsitter: { id: { $eq: me.id } } },
              },
            }
          );
          // 월 예약 카운트
          const thisMonthReservations = await strapi.entityService.findPage(
            "api::reservation.reservation",
            {
              filters: {
                petsitter: { id: { $eq: me.id } },
                reservationDate: {
                  $lte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1,
                    1
                  )
                    .toISOString()
                    .substring(0, 10),
                  $gt: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1
                  )
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
                petsitter: { id: { $eq: me.id } },
                reservationDate: {
                  $lte: new Date(
                    new Date().setDate(
                      new Date().getDate() - new Date().getDay() + 5
                    )
                  )
                    .toISOString()
                    .substring(0, 10),
                  $gt: new Date(
                    new Date().setDate(
                      new Date().getDate() - new Date().getDay()
                    )
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
                petsitter: { id: { $eq: me.id } },
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
              filters: {
                petsitter: { id: { $eq: me.id } },
                progress: { $eq: "RESERVATION_CONFIRMED" },
              },
            }
          );
          // 신청 예약 카운트
          const requestReservations = await strapi.entityService.findPage(
            "api::reservation.reservation",
            {
              filters: {
                petsitter: { id: { $eq: me.id } },
                progress: { $eq: "RESERVATION_REQUEST" },
              },
            }
          );
          const modifiedMe = {
            id: me.id,
            email: me.email,
            username: me.username,
            nickname: me.nickname,
            phone: me.phone,
            address: me.address,
            photo: me.photo,
            possiblePetType: me.possiblePetType,
            possibleLocation: me.possibleLocation,
            possibleDay: me.possibleDay,
            possibleStartTime: me.possibleStartTime,
            possibleEndTime: me.possibleEndTime,
            body: me.body,
            star:
              Math.ceil(
                (reviews.results
                  .map((review) => review.star)
                  .reduce((acc, cur) => acc + cur, 0) /
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
          return ctx.send(modifiedMe);
        } catch (error) {
          return ctx.badRequest("Fail to fetch petsitter information");
        }
      }
    } catch (e) {
      return ctx.badRequest("fail to get a user");
    }
  };

  // 유저 1명 조회
  plugin.controllers.user.findOne = async (ctx) => {
    const { id: userId } = ctx.params;

    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        {
          populate: {
            photo: { fields: ["id", "url"] },
            role: { fields: ["type"] },
          },
        }
      );

      // Client
      if (user.role.type === "public") {
        const modifiedUser = {
          id: user.id,
          email: user.email,
          username: user.username,
          nickname: user.nickname,
          phone: user.phone,
          address: user.address,
          photo: user.photo,
          body: user.body,
          isPetsitter: false,
        };

        return ctx.send(modifiedUser);
      } else if (user.role.type === "petsitter") {
        // Petsitter
        const reviews = await strapi.entityService.findPage(
          "api::review.review",
          { filters: { reservation: { petsitter: { id: { $eq: userId } } } } }
        );

        const modifiedPetsitter = {
          petsitterId: user.id,
          email: user.email,
          name: user.username,
          nickname: user.nickname,
          phone: user.phone,
          address: user.address,
          photo: user.photo,
          isPetsitter: true,
          possiblePetType: user.possiblePetType,
          possibleLocation: user.possibleLocation,
          possibleDay: user.possibleDay,
          possibleStartTime: user.possibleStartTime,
          possibleEndTime: user.possibleEndTime,
          body: user.body,
          star:
            Math.ceil(
              (reviews.results
                .map((review) => review.star)
                .reduce((acc, cur) => acc + cur, 0) /
                reviews.results.length) *
                10
            ) / 10,
          reviewCount: reviews.pagination.total,
        };

        console.log(modifiedPetsitter);
        return ctx.send(modifiedPetsitter);
      }

      return ctx.send(user);
    } catch (e) {
      return ctx.badRequest("Fail to fetch a user.");
    }
  };

  // 유저 생성
  plugin.controllers.auth.register = async (ctx) => {
    const { username, nickname, email, address, password, phone, isPetsitter } =
      ctx.request.body;

    if (
      !username ||
      !nickname ||
      !email ||
      !address ||
      !password ||
      !phone ||
      typeof isPetsitter !== "boolean"
    ) {
      return ctx.badRequest(
        "All fields are required: username, nickname, email, address, password, phone, and isPetsitter."
      );
    }

    try {
      const newMember = await strapi.entityService.create(
        "plugin::users-permissions.user",
        {
          data: {
            ...ctx.request.body,
            provider: "local",
            role: {
              connect: [isPetsitter ? 3 : 2],
            },
          },
        }
      );

      return ctx.send({
        message: "Successfully create a user",
        id: newMember.id,
      });
    } catch (e) {
      console.log(e);
      return ctx.badRequest("Fail to create a user");
    }
  };

  // 유저 수정
  plugin.controllers.user.update = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { id: paramId } = ctx.params;

    const { file } = ctx.request.files;

    if (userId === +paramId) {
      let data = {
        data: {
          ...JSON.parse(ctx.request.body.data),
        },
        files: file ? { photo: file } : null,
      };

      try {
        const updatedUser = await strapi.entityService.update(
          "plugin::users-permissions.user",
          userId,
          data
        );

        return ctx.send({
          message: "Successfully update the user",
          id: updatedUser.id,
        });
      } catch (e) {
        return ctx.badRequest("Fail to update the user", {
          errors: e.details.errors,
        });
      }
    }
  };

  // 유저 삭제
  plugin.controllers.user.destroy = async (ctx) => {
    if (!ctx.state.user || ctx.state.user !== +ctx.params.id) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { id: paramId } = ctx.params;

    if (userId === +paramId) {
      try {
        const deletedUser = await strapi.entityService.delete(
          "plugin::users-permissions.user",
          userId
        );
        return ctx.send({
          message: "Successfully delete the user",
          id: deletedUser.id,
        });
      } catch (e) {
        return ctx.badRequest("Fail to delete the user");
      }
    }
  };

  // 펫시터 찜하기
  plugin.controllers.user.like = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId, role } = ctx.state.user;
    const { petsitterId } = ctx.params;

    if (role.type !== "public") {
      return ctx.unauthorized(
        "You do not have permission to add this to your favorites."
      );
    }

    if (userId === +petsitterId) {
      return ctx.badRequest("자신을 찜할 수 없습니다.");
    }

    try {
      const currentUser = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        {
          populate: {
            likes: { fields: ["id"] },
          },
        }
      );

      const likesIndex = currentUser.likes.findIndex(
        (likes) => likes.id === +petsitterId
      );

      let isLiked;

      if (likesIndex !== -1) {
        // 찜 목록에 있다면 찜 해제
        isLiked = false;

        await strapi.entityService.update(
          "plugin::users-permissions.user",
          userId,
          { data: { likes: { disconnect: [+petsitterId] } } as any }
        );
      } else {
        // 찜 목록에 없다면 찜하기
        isLiked = true;

        await strapi.entityService.update(
          "plugin::users-permissions.user",
          userId,
          {
            data: {
              likes: { connect: [petsitterId] },
            } as any,
          }
        );
      }

      return ctx.send({ data: isLiked });
    } catch (e) {
      return ctx.badRequest("Fail to update the like");
    }
  };

  // 찜한 펫시터 목록 조회
  plugin.controllers.user.favoritePetsitter = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { page, pageSize } = ctx.query;

    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        {
          populate: {
            likes: {
              start: (page - 1) * pageSize, // Apply pagination here
              limit: pageSize,
              populate: {
                photo: { fields: ["id", "url"] },
                // reservations_petsitter: {
                //   populate: { review: { fields: ["star"] } },
                // },
              },
            },
          },
        }
      );

      const modifiedPetsitters = user.likes.map((petsitter) => {
        const reservations = petsitter.reservations_petsitter || [];

        // Calculate the star rating
        // const totalStars = reservations
        //   .filter(
        //     (reservation) => reservation.review && reservation.review.star
        //   )
        //   .reduce((acc, cur) => acc + cur.review.star, 0);

        // const reviewCount = reservations.filter(
        //   (reservation) => reservation.review
        // ).length;

        // Avoid division by zero
        // const averageStar =
        //   reviewCount > 0 ? Math.ceil((totalStars / reviewCount) * 10) / 10 : 0;

        return {
          id: petsitter.id,
          email: petsitter.email,
          username: petsitter.username,
          nickname: petsitter.nickname,
          phone: petsitter.phone,
          address: petsitter.address,
          photo: petsitter.photo,
          possiblePetType: petsitter.possiblePetType,
          possibleLocation: petsitter.possibleLocation,
          possibleDay: petsitter.possibleDay,
          possibleStartTime: petsitter.possibleStartTime,
          possibleEndTime: petsitter.possibleEndTime,
          body: petsitter.body,
          // star: averageStar,
          // reviewCount: reviewCount,
        };
      });

      return ctx.send(modifiedPetsitters);
    } catch (e) {
      return ctx.badRequest("Fail to fetch favorites");
    }
  };

  // 필터에 맞는 펫시터 조회
  plugin.controllers.user.possiblePetsitter = async (ctx) => {
    const { date, startTime, endTime, address, petType, page, pageSize } =
      ctx.query;

    let filters = { role: { type: { $eq: "petsitter" } } } as any;

    if (date) {
      filters.possibleDay = {
        $contains: new Date(date).toLocaleDateString("ko", {
          weekday: "short",
        }),
      };
    }

    if (startTime && endTime) {
      filters.possibleStartTime = { $lte: startTime };
      filters.possibleEndTime = { $gte: endTime };
    }

    if (address) {
      // 예) "서울시 용산구"
      filters.possibleLocation = { $contains: address };
    }

    if (petType) {
      // Convert petType from a comma-separated string to an array
      const petTypeArray = petType.split(","); // ["DOG", "CAT"]

      // Apply $contains logic similar to possibleDay, using $or to combine
      filters.$or = petTypeArray.map((type) => ({
        possiblePetType: { $contains: type },
      }));
    }

    try {
      const petsitters = await strapi.entityService.findPage(
        "plugin::users-permissions.user",
        {
          filters,
          populate: { photo: { fields: ["id", "url"] } },
          fields: [
            "nickname",
            "email",
            "address",
            "body",
            "phone",
            "possibleDay",
            "possibleLocation",
            "possiblePetType",
            "possibleStartTime",
            "possibleEndTime",
          ],
          page,
          pageSize,
        }
      );
      return ctx.send(petsitters);
    } catch (e) {
      return ctx.badRequest("Fail to fetch petsitters");
    }
  };

  // 이용한 펫시터 조회
  plugin.controllers.user.usedPetsitter = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    // reservation을 검색한 다음에 client가 나인 예약을 찾고 그 예약에서 펫시터만 모아서 pagination
    const { id: userId } = ctx.state.user;
    const { pageSize, page } = ctx.query;

    try {
      const relatedReservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          sort: { createdAt: "desc" },
          filters: { client: { id: { $eq: userId } } },
          populate: {
            petsitter: {
              fields: [
                "id",
                "nickname",
                "body",
                "possibleDay",
                "possibleStartTime",
                "possibleEndTime",
                "possibleLocation",
                "phone",
              ],
            },
          },
          page,
          pageSize,
        }
      );

      const seenPetsitterIds = [];

      const uniquePetsitters = relatedReservations.results
        .map((reservation) => reservation.petsitter)
        .filter((petsitter) => {
          if (seenPetsitterIds.indexOf(petsitter.id) === -1) {
            seenPetsitterIds.push(petsitter.id); // Track this petsitter's id
            return true; // Keep this petsitter
          }
          return false; // Filter out duplicate petsitter
        });

      return ctx.send({
        results: uniquePetsitters,
        pagination: relatedReservations.pagination,
      });
    } catch (e) {
      return ctx.badRequest("Fail to fetch petsitter");
    }
  };

  // 펫시터 찜하기 route
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "user/favorite/:petsitterId",
    handler: "user.like",
    config: {
      prefix: "",
    },
  });

  // 찜한 펫시터 목록 조회
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/user/favoritePetsitter",
    handler: "user.favoritePetsitter",
    config: {
      prefix: "",
    },
  });

  // 필터에 맞는 펫시터 조회 route
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/user/possiblePetsitter",
    handler: "user.possiblePetsitter",
    config: {
      prefix: "",
    },
  });

  // 내가 이용한 펫시터 조회 route
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/user/usedPetsitter",
    handler: "user.usedPetsitter",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
``;
