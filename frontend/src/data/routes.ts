const APPS = "apps";
const KP = "kupi-prodai";
const APPSKP = `${APPS}/${KP}`;
const NU_EVENTS = "nu-events";
const DORM_EATS = "dorm-eats";
const ABOUT = "about";
const ADMIN = "admin";
const PRODUCT = "product";
const PRODUCTS = "products";
const USERS = "users";
const USER = "user";
export const ROUTES = {
  HOME: "/",
  APPS: {
    BASEURL: APPS,
    KP: `${APPSKP}`,
    KP_PRODUCT_ID: `${APPSKP}/product/:id`,
    NU_EVENTS: `${APPSKP}/${NU_EVENTS}`,
    DORM_EATS: `${APPSKP}/${DORM_EATS}`,
    ABOUT: `${APPSKP}/${ABOUT}`,
  },
  ADMIN: {
    BASEURL: `/${ADMIN}`,
    PRODUCTS: `/${ADMIN}/${PRODUCTS}`,
    PRODUCT: `/${ADMIN}/${PRODUCT}`,
    USERS: `/${ADMIN}/${USERS}`,
    USER: `/${ADMIN}/${USER}`,
  },
};

export const SUBROUTES = {
  APPS: {
    KP,
    NU_EVENTS,
    DORM_EATS,
    ABOUT,
    KP_PRODUCT_ID: `${KP}/product/:id`,
  },
  ADMIN: {
    BASEURL: ADMIN,
    PRODUCTS: `${PRODUCTS}`,
    PRODUCT_ID: `${PRODUCT}/:id`,
    USERS: `${USERS}`,
    USER: `${USER}/:id`,
  },
};
