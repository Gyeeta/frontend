
const CracoLessPlugin = require('craco-less');


module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {			
            modifyVars: { '@body-background' : '#121212' },
            javascriptEnabled: true,
	  },
        },
      },
    },
  ],
};


