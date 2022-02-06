module.exports.apiResponses = {
  _200: function (body) {
    return {
      statusCode: 200,
      body: JSON.stringify(body, null, 2),
    };
  },
  _400: function (body) {
    return {
      statusCode: 400,
      body: JSON.stringify(body, null, 2),
    };
  },
};
