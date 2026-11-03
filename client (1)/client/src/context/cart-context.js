import { createContext } from 'react';

export const CartContext = createContext(null);

// Most of one item (in one size) a customer can put in the cart.
export const MAX_QTY = 10;
