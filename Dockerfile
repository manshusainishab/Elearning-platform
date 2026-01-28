FROM node:18-bullseye-slim

WORKDIR /Elearning-platform

# Install build deps for bcrypt
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
