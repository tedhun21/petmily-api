export default {
  routes: [
    // 예약 가능 펫시터 찾기
    {
      method: "GET",
      path: "/reservations/petsitters",
      handler: "reservation.findPossiblePetsitter",
    },
  ],
};
