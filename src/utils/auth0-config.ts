// src/auth0-config.ts

const Auth0Config = {
    domain: import.meta.env.VITE_domain,
    clientId: import.meta.env.VITE_clientId,
    redirectUri: window.location.origin,
  };
  
  export default Auth0Config;
  