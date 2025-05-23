# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory for Node.js/Next.js app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) for the Next.js app
COPY admin-panel/package*.json ./
# If using yarn, copy yarn.lock instead and use yarn commands

# Install Next.js dependencies
RUN npm install 
# If using yarn: RUN yarn install --frozen-lockfile

# Copy the rest of the Next.js application code
COPY admin-panel/ ./

# Build the Next.js application
RUN npm run build
# If using yarn: RUN yarn build

# Expose the port the Next.js app runs on
EXPOSE 3000

# Define the command to start the Next.js app
# The Python app would need to be started by a different mechanism if it's a server,
# or this container might just run the Next.js app and the Python code is for build-time tasks or scripts.
CMD ["npm", "start"]
# If using yarn: CMD ["yarn", "start"]
