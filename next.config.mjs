/** @type {import('next').NextConfig} */
export default {
  outputFileTracingIncludes: {
    "/api/ai": ["./content/**/*"],
    "/api/admin/clean": ["./private/maths-pages/*"],
  },
};
