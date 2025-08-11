# Wizard Scoreboard

A digital scoreboard for the card game Wizard, built with Vite, React, and TypeScript.

## Features
- Easy management of players and rounds
- Clear display of scores
- Responsive design for desktop and mobile

## Development

```bash
npm install
npm run dev
```

## Production & Deployment

The project can be built with Docker and served using nginx:

```bash
docker build -t wizard-scoreboard .
docker run -p 8080:80 wizard-scoreboard
```

