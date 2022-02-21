const apiResponses = {
  _200: (body) => {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(body, null, 2),
    };
  },
  _400: (body) => {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(body, null, 2),
    };
  },
};

const apiError = {
  _400: (e) => {
    if (typeof e === "string") {
      return apiResponses._400({ message: e.toUpperCase() });
    } else if (e instanceof Error) {
      return apiResponses._400({ message: e.message });
    }
  }
};

module.exports = {
  apiResponses,
  apiError,
};