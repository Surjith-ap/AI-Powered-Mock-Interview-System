/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    webpack: (config) => {
        config.module.rules.push({
          test: /pdf\.worker\.(min\.)?js$/,
          use: 'file-loader',
        });
        return config;
      },
};

export default nextConfig;
