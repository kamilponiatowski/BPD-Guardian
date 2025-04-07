module.exports = {
    plugins: [
      require('postcss-import'),
      require('postcss-preset-env')({
        stage: 2,
        features: {
          'nesting-rules': true,
          'custom-properties': true,
          // Usuwamy color-mod-function, która nie jest już obsługiwana
        }
      }),
      // Używamy minify tylko w środowisku produkcyjnym
      process.env.NODE_ENV === 'production' ? require('postcss-minify') : null
    ].filter(Boolean)
  };