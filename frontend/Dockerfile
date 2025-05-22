# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY admin-panel/package*.json ./
# If using yarn, copy yarn.lock instead and use yarn commands

# Install dependencies
RUN npm install 
# If using yarn: RUN yarn install --frozen-lockfile

# Copy the rest of the Next.js application code
COPY admin-panel/ ./

# Build the Next.js application
RUN npm run build
# If using yarn: RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to start the app
CMD ["npm", "start"]
# If using yarn: CMD ["yarn", "start"]
