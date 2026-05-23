const dayjs = require("dayjs");

const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const formatDate = (date) => {
  return dayjs(date).tz("Asia/Kolkata").format("DD MMM YY • hh:mm A");
};

module.exports = formatDate;
