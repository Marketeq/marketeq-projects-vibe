self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/talent/:l1",
        "destination": "/c/:l1/talent"
      },
      {
        "source": "/talent/:l1/:l2",
        "destination": "/c/:l1/:l2/talent"
      },
      {
        "source": "/talent/:l1/:l2/:l3",
        "destination": "/c/:l1/:l2/:l3/talent"
      },
      {
        "source": "/projects/:l1",
        "destination": "/c/:l1/projects"
      },
      {
        "source": "/projects/:l1/:l2",
        "destination": "/c/:l1/:l2/projects"
      },
      {
        "source": "/projects/:l1/:l2/:l3",
        "destination": "/c/:l1/:l2/:l3/projects"
      },
      {
        "source": "/services/:l1",
        "destination": "/c/:l1/services"
      },
      {
        "source": "/services/:l1/:l2",
        "destination": "/c/:l1/:l2/services"
      },
      {
        "source": "/services/:l1/:l2/:l3",
        "destination": "/c/:l1/:l2/:l3/services"
      },
      {
        "source": "/teams/:l1",
        "destination": "/c/:l1/teams"
      },
      {
        "source": "/teams/:l1/:l2",
        "destination": "/c/:l1/:l2/teams"
      },
      {
        "source": "/teams/:l1/:l2/:l3",
        "destination": "/c/:l1/:l2/:l3/teams"
      },
      {
        "source": "/cms-media/:path*",
        "destination": "/media/:path*"
      },
      {
        "source": "/media/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()