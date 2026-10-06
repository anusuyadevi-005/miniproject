FROM node:22-alpine

WORKDIR /app

# Install system utilities
RUN apk add --no-cache git python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
