# **DOCUMENT 07 -- FRONTEND INTEGRATION -- NEXT.JS FAVORITES UI**

PURPOSE\
Implement the favorites UI in your Next.js app so users can add/remove
items and view groups. You'll create API client utilities, React hooks,
and components for:\
• Adding a favorite on any listing page\
• Displaying favorite groups (grid and list)\
• Moving and removing favorites

PREREQUISITES\
• Documents 01--06 complete\
• Next.js project with TypeScript and TailwindCSS\
• NextAuth configured for user sessions

DIRECTORY STRUCTURE

next-app/

└─ src/

├─ lib/

│ └─ api.ts

├─ hooks/

│ └─ useFavorites.ts

├─ components/

│ ├─ FavoriteButton.tsx

│ ├─ FavoriteGroupList.tsx

│ └─ FavoriteItem.tsx

└─ pages/

└─ favorites.tsx

STEP 1 -- Install HTTP Client\
From your Next.js project root, install axios:

npm install axios

STEP 2 -- API Utility\
Create src/lib/api.ts:

import axios from \'axios\';

import { getSession } from \'next-auth/react\';

const API_BASE = process.env.NEXT_PUBLIC_FAVORITES_API_URL; // e.g.
\"https://api.marketeq.com\"

export async function apiClient() {

const session = await getSession();

const token = session?.accessToken;

return axios.create({

baseURL: API_BASE,

headers: {

Authorization: token ? \`Bearer \${token}\` : \'\',

\'Content-Type\': \'application/json\',

},

});

}

STEP 3 -- React Hook for Favorites\
Create src/hooks/useFavorites.ts:

import { useState, useEffect, useCallback } from \'react\';

import { apiClient } from \'../lib/api\';

export interface FavoriteGroup {

id: string;

name: string;

favorites: { id: string; type: string; itemId: string }\[\];

}

export function useFavorites() {

const \[groups, setGroups\] = useState\<FavoriteGroup\[\]\>(\[\]);

const \[loading, setLoading\] = useState(false);

const fetchGroups = useCallback(async () =\> {

setLoading(true);

const client = await apiClient();

const res = await client.get\<FavoriteGroup\[\]\>(\'/favorites\');

setGroups(res.data);

setLoading(false);

}, \[\]);

const addFavorite = useCallback(

async (type: string, itemId: string, groupId?: string) =\> {

const client = await apiClient();

const payload = groupId

? { type, itemId, groupId }

: { type, itemId };

await client.post(\'/favorites\', payload);

await fetchGroups();

},

\[fetchGroups\],

);

const moveFavorite = useCallback(

async (favId: string, groupId: string) =\> {

const client = await apiClient();

await client.patch(\`/favorites/\${favId}\`, { groupId });

await fetchGroups();

},

\[fetchGroups\],

);

const removeFavorite = useCallback(

async (favId: string) =\> {

const client = await apiClient();

await client.delete(\`/favorites/\${favId}\`);

await fetchGroups();

},

\[fetchGroups\],

);

useEffect(() =\> {

fetchGroups();

}, \[fetchGroups\]);

return { groups, loading, addFavorite, moveFavorite, removeFavorite };

}

STEP 4 -- FavoriteButton Component\
Create src/components/FavoriteButton.tsx:

import { FC } from \'react\';

import { useFavorites } from \'../hooks/useFavorites\';

interface Props {

type: string; // \'project\',\'talent\',\'service\',\'job\',\'team\'

itemId: string;

}

export const FavoriteButton: FC\<Props\> = ({ type, itemId }) =\> {

const { groups, addFavorite } = useFavorites();

const handleClick = () =\> {

// If you want to prompt for group selection, pass a groupId. Otherwise
AI will assign.

addFavorite(type, itemId);

};

return (

\<button

onClick={handleClick}

className=\"px-2 py-1 text-sm bg-blue-500 text-white rounded\"

\>

Add to Favorites

\</button\>

);

};

Use this button in any listing page. Example in
pages/project/\[id\].tsx:

import { FavoriteButton } from \'../../components/FavoriteButton\';

export default function ProjectPage({ project }) {

return (

\<div\>

{/\* project details \*/}

\<FavoriteButton type=\"project\" itemId={project.id} /\>

\</div\>

);

}

STEP 5 -- FavoriteItem Component\
Create src/components/FavoriteItem.tsx:

import { FC, useState } from \'react\';

import { FavoriteGroup } from \'../hooks/useFavorites\';

interface Props {

fav: { id: string; type: string; itemId: string };

groups: FavoriteGroup\[\];

moveFavorite: (favId: string, groupId: string) =\> Promise\<void\>;

removeFavorite: (favId: string) =\> Promise\<void\>;

}

export const FavoriteItem: FC\<Props\> = ({

fav,

groups,

moveFavorite,

removeFavorite,

}) =\> {

const \[targetGroup, setTargetGroup\] = useState(fav.type);

return (

\<div className=\"flex items-center space-x-2\"\>

\<span\>{fav.itemId}\</span\>

\<select

value={fav.groupId \|\| \'\'}

onChange={e =\> moveFavorite(fav.id, e.target.value)}

className=\"border px-1 py-0.5\"

\>

{groups.map(g =\> (

\<option key={g.id} value={g.id}\>

{g.name}

\</option\>

))}

\</select\>

\<button

onClick={() =\> removeFavorite(fav.id)}

className=\"px-1 text-red-600\"

\>

×

\</button\>

\</div\>

);

};

STEP 6 -- FavoriteGroupList Component\
Create src/components/FavoriteGroupList.tsx:

import { FC } from \'react\';

import { useFavorites } from \'../hooks/useFavorites\';

import { FavoriteItem } from \'./FavoriteItem\';

export const FavoriteGroupList: FC = () =\> {

const { groups, loading, moveFavorite, removeFavorite } =
useFavorites();

if (loading) {

return \<div\>Loading favorites...\</div\>;

}

return (

\<div className=\"space-y-6\"\>

{groups.map(group =\> (

\<div key={group.id}\>

\<h2 className=\"text-lg font-bold\"\>{group.name}\</h2\>

\<div className=\"space-y-2\"\>

{group.favorites.map(fav =\> (

\<FavoriteItem

key={fav.id}

fav={fav}

groups={groups}

moveFavorite={moveFavorite}

removeFavorite={removeFavorite}

/\>

))}

\</div\>

\</div\>

))}

\</div\>

);

};

STEP 7 -- Favorites Page\
Create src/pages/favorites.tsx:

import { NextPage } from \'next\';

import { FavoriteGroupList } from \'../components/FavoriteGroupList\';

import { getSession } from \'next-auth/react\';

export const getServerSideProps = async context =\> {

const session = await getSession(context);

if (!session) {

return { redirect: { destination: \'/api/auth/signin\', permanent: false
} };

}

return { props: {} };

};

const FavoritesPage: NextPage = () =\> (

\<div className=\"max-w-3xl mx-auto p-4\"\>

\<h1 className=\"text-2xl font-bold mb-4\"\>My Favorites\</h1\>

\<FavoriteGroupList /\>

\</div\>

);

export default FavoritesPage;

STEP 8 -- Tailwind Styling\
Ensure your Tailwind config allows simple utility classes used above
(space-y-6, px-2, etc.). No additional setup is required if Tailwind is
already configured.

STEP 9 -- Test in Browser

1.  Start Next.js: npm run dev

2.  Log in via NextAuth

3.  Navigate to /favorites to view groups and items

4.  On any listing page, click "Add to Favorites" and confirm it appears
    in groups

FRONTEND INTEGRATION COMPLETE\
You now have a full UI for adding, viewing, moving, and removing
favorites.
