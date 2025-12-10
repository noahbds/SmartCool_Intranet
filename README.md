# SmartCool Pro Intranet

SmartCool Pro Intranet is a dashboard for managing the Zero-Waste Smart Fridge project. It provides an overview of the project status, planning, team, budget, risks, and communications.

## Features

- **Dashboard**: High-level overview of project progress and key metrics.
- **Planning & Gantt**: Detailed project timeline and milestones.
- **Team & Skills**: Information about team members and their roles.
- **Budget & Resources**: Financial tracking and resource allocation.
- **Risk Management**: Identification and mitigation of project risks.
- **Communications**: Internal and external communication logs.
- **Delivery & Defense**: Final project delivery and defense preparation.

## Tech Stack

- **Frontend**: Static HTML, CSS, and vanilla JavaScript
- **Backend**: Vercel serverless functions (Node.js)
- **Data**: JSON files in `/data` consumed by the API routes
- **Optional cache**: Redis (set `REDIS_URL`) for persisting the Gantt edits across deployments
- **Icons**: FontAwesome

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd SmartCool_Intranet
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the dev server (Vercel):**
    ```bash
    npm run vercel
    # or
    npx vercel dev
    ```

4.  **Open the application:**
    Open your browser and navigate to `http://localhost:3000`.

### Optional: enable Redis caching

Add a `.env.local` with:

```
REDIS_URL=redis://<user>:<password>@<host>:<port>
```

This keeps Gantt edits persistent when running on read-only filesystems (e.g., Vercel serverless).

## Project Structure

- `api/`: Serverless API endpoints (Vercel) that read JSON in `/data` and optionally cache to Redis.
- `public/`: Static HTML, CSS, and JS assets for each section of the intranet.
- `data/`: JSON data files consumed by the API routes and pages.
- `vercel.json`: Deployment configuration.

## License

This project is proprietary to SmartCool Pro.
