This document outlines the required approach for data fetching within
our Next.js application.

# Core Requirement: Use Tanstack Query

The native data fetching methods provided by Next.js must be avoided.
Instead, all data fetching, state management, caching, and
synchronization with the server must be handled exclusively using
Tanstack Query (formally React Query).

**Avoid fetching data in server components using the native** fetch

  -----------------------------------------------------------------------
  // src/app/profile/page.js - A Server Component\
  \
  **async** **function** **getProfileData**() {\
  **const** response = **await**
  fetch(\'https://api.example.com/profile');\
  \
  **if** (!response.ok) {\
  **throw** **new** Error(\'Failed to fetch profile data\');\
  }\
  \
  **return** response.json();\
  }\
  \
  **export** **default** async **function** **ProfilePage**() {\
  **const** data = await getProfileData();\
  \
  **return** (\
  \<**div**\>\
  \<**h1**\>User Profile\</**h1**\>\
  \<**p**\>Name: {data.name}\</**p**\>\
  \<**p**\>Email: {data.email}\</**p**\>\
  \</**div**\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Avoid using the use hook API in client components as well**

+-----------------------------------------------------------------------+
| // src/app/users/page.js - A Server Component\                        |
| \                                                                     |
| **async** **function** **getUsersData**() {\                          |
| **const** response = **await**                                        |
| fetch(\'https://api.example.com/users');\                             |
| \                                                                     |
| **if** (!response.ok) {\                                              |
| **throw** **new** Error(\'Failed to fetch profile data\');\           |
| }\                                                                    |
| \                                                                     |
| **return** response.json();\                                          |
| }\                                                                    |
| \                                                                     |
| **export** **default** async **function** **UsersPage**() {\          |
| **return** (\                                                         |
| \<**div**\>                                                           |
|                                                                       |
| \<Suspense fallback={null} \>\                                        |
| \<Users fetchUsers={getProfileData} /\>                               |
|                                                                       |
| \</Suspense\>                                                         |
|                                                                       |
| \</**div**\>\                                                         |
| );\                                                                   |
| }                                                                     |
+=======================================================================+

  -----------------------------------------------------------------------
  // components/users.js\
  \'use client\'\
  \
  **export** **const** Users = ({ fetchUsers }) =\> {\
  **const** users = use(fetchUsers);\
  **return** (\
  \<pre\>\
  {JSON.stringify(users, 2, null)}\
  \</pre\>\
  );\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
