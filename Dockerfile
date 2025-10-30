FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps || npm install --production

# Copy pre-built dist folder (build locally first!)
COPY dist ./dist

# Create logs and data directories
RUN mkdir -p logs data

EXPOSE 3000

CMD ["node", "dist/index.js"]