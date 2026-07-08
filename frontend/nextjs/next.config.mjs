/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimisations performance
  productionBrowserSourceMaps: false, // Désactiver les source maps en prod
  
  typescript: {
    tsconfigPath: './tsconfig.json',
    // Supprimer ignoreBuildErrors pour que les erreurs soient détectées tôt
    // ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true, // Acceptable pour dev, optimiser en production
  },
  
  // Optimiser la compilation en dev
  turbopack: {
    // Chemin absolu vers la racine du projet pour corriger
    // l'inférence de workspace de Turbopack sous Windows.
    root: 'D:/copie/eartisan/frontend',
  },

  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'recharts',
    ],
  },
  
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'http://localhost:8000/media/:path*',
      },
    ]
  },
}

export default nextConfig
