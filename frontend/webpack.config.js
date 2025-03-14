module.exports = {
    resolve: {
      fallback: {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser")
      }
    }
  };