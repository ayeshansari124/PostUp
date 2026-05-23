const dayjs = require("dayjs");

const formatDate = (date) => {
  return dayjs(date).format("DD MMM YY • hh:mm A");
};

module.exports = formatDate;
