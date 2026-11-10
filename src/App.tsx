import { useState } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, Outlet, RouterProvider, useMatch, useParams, type RouteObject } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ToastProvider } from './components/Toast';
import { StoreProvider, useStore } from './store/store';
import { LibraryPage } from './pages/LibraryPage';
import { CreatePage } from './pages/CreatePage';
import { SheetPage } from './pages/SheetPage';
import { EquipmentPage } from './pages/EquipmentPage';
import type { AppData } from './rules';

export interface LibraryLocationState { notice?: string }

function Layout() {
  const inCharacter = useMatch('/character/*');
  return (
    <ToastProvider>
      <TopBar className={inCharacter ? 'topbar--compact-on-phone' : ''} />
      <Outlet />
    </ToastProvider>
  );
}

/** Resolves :id; unknown ids go back to the Library with a notice. */
function CharacterRoute({ view }: { view: 'sheet' | 'equipment' }) {
  const { id } = useParams();
  const character = useStore().getCharacter(id);
  if (!character) return <Navigate to="/" replace state={{ notice: 'Character not found' } satisfies LibraryLocationState} />;
  return view === 'sheet' ? <SheetPage character={character} /> : <EquipmentPage character={character} />;
}

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LibraryPage /> },
      { path: '/new', element: <CreatePage /> },
      { path: '/character/:id', element: <CharacterRoute view="sheet" /> },
      { path: '/character/:id/equipment', element: <CharacterRoute view="equipment" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export function App() {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}

/** Test harness: in-memory router + optional fixed data. */
export function TestApp({ path = '/', initial }: { path?: string; initial?: AppData }) {
  const [router] = useState(() => createMemoryRouter(routes, { initialEntries: [path] }));
  return (
    <StoreProvider initial={initial}>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
