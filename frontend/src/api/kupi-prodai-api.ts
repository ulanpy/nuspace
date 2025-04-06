import { request } from "../api/request";
export const createProduct = (newList: {}) => {
  request("/new-product", {
    method: "POST",
    body: JSON.stringify(newList),
  });
};

export const getAllProducts = (): Promise<Types.Product[]> => {
  return request("/all-products");
};

export const removeProduct = (id: number) => {
  request(`/remove-product/${id}`, {
    method: "DELETE",
  });
};

export const updateProduct = (id: number, newName: Types.Product) => {
  request(`/update-product/${id}`, {
    method: "POST",
    body: JSON.stringify(newName),
  });
};

export const searchProduct = (keyword: string) => {
  request(`/search-for-product`, { params: { keyword } });
};

export const filterProducts = () => {};
