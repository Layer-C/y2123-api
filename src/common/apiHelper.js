module.exports.apiResponses = {
  _200: (body) => {
    return {
      statusCode: 200,
      body: JSON.stringify(body, null, 2),
    };
  },
  _400: (body) => {
    return {
      statusCode: 400,
      body: JSON.stringify(body, null, 2),
    };
  },
};

module.exports.apiError = {
  _400: (e) => {
    if (typeof e === "string") {
      return apiResponses._400({ message: e.toUpperCase() });
    } else if (e instanceof Error) {
      return apiResponses._400({ message: e.message });
    }
  }
};