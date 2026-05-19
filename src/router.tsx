import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { Grid } from './Grid'
import { ProfileModal } from './ProfileModal'
import { fetchProfile } from './api'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Grid />
      <Outlet />
    </>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
})

const nameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$name',
  loader: ({ params }) => fetchProfile(params.name),
  staleTime: 5 * 60 * 1000,
  component: ProfileRoute,
})

function ProfileRoute() {
  const { name } = nameRoute.useParams()
  const profile = nameRoute.useLoaderData()
  const navigate = useNavigate()
  return (
    <ProfileModal
      name={name}
      profile={profile}
      onClose={() => navigate({ to: '/' })}
    />
  )
}

const routeTree = rootRoute.addChildren([indexRoute, nameRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
