module.exports = {
    plugins: {
        'postcss-import': {},
        'postcss-preset-env': {
            features: {
                'not-pseudo-class': false, // Disable as this changes specificity
            },
        },
        ...(process.env.NODE_ENV === 'production'
          ? {
              cssnano: {
                  preset: [require('cssnano-preset-default'), { calc: false }],
              },
          }
          : {}),
    },
};
