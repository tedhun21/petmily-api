module.exports = (plugin) => {
  plugin.controllers.user.find = (ctx) => {
    console.log(ctx);
    ctx.body = "hi";
  };

  plugin.controllers.user.me = (ctx) => {
    console.log(ctx.state.user);
    ctx.body = {
      memberId: 1,
      email: "member1@gmail.com",
      name: "멤버일",
      nickName: "patchtest123",
      phone: "01082839242",
      address: "00001 서울 강동구 강동아파트 1",
      photo: null,
      body: "멤버수정테스",
      petsitterBoolean: false,
    };
  };
  return plugin;
};
