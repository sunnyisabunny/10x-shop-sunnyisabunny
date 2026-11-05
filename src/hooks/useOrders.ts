/**
 * NOTE: the saved orders, plus a clock for showing their live status (PRD P6).
 * Why it exists: Checkout adds orders and two pages read them, so that logic is written once.
 * Connects to: `useLocalStorage` saves under `shop_orders`. `models/Order.ts` holds the status rules.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Order } from "../models/Order";
import type { OrderRecord } from "../types/order";
import { ORDER_REFRESH_MS, STORAGE_KEYS } from "../utils/constants";
import { parseOrders } from "../utils/guards";
import { useLocalStorage } from "./useLocalStorage";

export interface UseOrdersResult {
  /** Newest first (PRD P6.1), as Order objects with their methods. */
  orders: Order[];
  /** The plain saved list, which `Order.create` needs for the next order number. */
  records: OrderRecord[];
  /** Saves an order. Returns false if storage refused, so the page can say the order wasn't placed. */
  addOrder: (order: Order) => boolean;
  /** Deletes every saved order, for Profile's "Clear local data". */
  clearOrders: () => void;
}

export function useOrders(): UseOrdersResult {
  const [records, setRecords, clearOrders] = useLocalStorage<OrderRecord[]>(STORAGE_KEYS.orders, [], parseOrders);

  const orders = useMemo(() => records.map(Order.from).sort((a, b) => b.id - a.id), [records]);

  const addOrder = useCallback((order: Order): boolean => setRecords([...records, order.toJSON()]), [records, setRecords]);

  return { orders, records, addOrder, clearOrders };
}

/**
 * The current time, refreshed on a timer, so a status can change while you watch it (PRD P6.2).
 * The defence question: "what happens without the cleanup?" Each visit would leave another interval running
 * forever, calling setState on a page that is gone. Each would hold memory, and they would pile up.
 */
export function useNow(intervalMs = ORDER_REFRESH_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
