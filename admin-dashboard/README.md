# GatewayQL Admin Dashboard

A modern, responsive admin dashboard for managing your GatewayQL GraphQL Gateway.

## Features

- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- ⚡ **Fast** - Powered by Vite and React 18
- 🔒 **Secure** - JWT-based authentication
- 📊 **Real-time** - GraphQL subscriptions support
- 📱 **Responsive** - Mobile-first design
- 🌙 **Dark Mode** - Supports light and dark themes

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 3** - Styling
- **shadcn/ui** - UI components
- **Apollo Client** - GraphQL client
- **React Router** - Routing
- **Lucide React** - Icons

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── card.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── apollo-client.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── Login.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Features

### Dashboard Pages

- **Overview Dashboard** - Key metrics and system status
- **Users Management** - CRUD operations for users
- **Credentials Management** - API keys and credentials
- **Health Monitoring** - Real-time system health
- **Analytics** - Usage metrics and trends

### Authentication

The dashboard uses JWT-based authentication. By default, it connects to the GatewayQL backend at `http://localhost:3000/admin`.

**Demo Credentials:**

- Username: `admin`
- Password: `password`

### GraphQL Integration

The dashboard uses Apollo Client to communicate with the GatewayQL backend. All GraphQL operations are automatically authenticated using JWT tokens stored in localStorage.

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_GRAPHQL_URL=http://localhost:3000/admin
VITE_API_URL=http://localhost:3000
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization

### Theme

The dashboard uses Tailwind CSS with custom color variables defined in `src/index.css`. You can customize the theme by modifying these CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}
```

### Adding Components

The dashboard uses shadcn/ui components. To add new components, copy them from the [shadcn/ui documentation](https://ui.shadcn.com/) into the `src/components/ui` directory.

## Development

### Adding New Pages

1. Create a new page component in `src/pages/`
2. Add the route in `src/App.tsx`
3. Add navigation link in `src/components/layout/DashboardLayout.tsx`

### GraphQL Queries

Create GraphQL queries and mutations in `src/graphql/` and use them with Apollo Client hooks:

```typescript
import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      username
      email
    }
  }
`;

function UsersPage() {
  const { data, loading, error } = useQuery(GET_USERS);
  // ...
}
```

## Deployment

### Using Docker

```bash
# Build the dashboard
docker build -t gatewayql-admin .

# Run the container
docker run -p 80:80 gatewayql-admin
```

### Using Nginx

1. Build the application: `npm run build`
2. Copy the `dist` directory to your web server
3. Configure Nginx to serve the static files

### Using Vercel/Netlify

1. Connect your repository to Vercel or Netlify
2. Set the build command to `npm run build`
3. Set the output directory to `dist`
4. Add environment variables

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please use the GitHub issue tracker or contact the development team.

---

Built with ❤️ by the GatewayQL Team
