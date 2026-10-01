import type { RequestHandler } from "express";

/**
 * Forward rejected async handlers to Express 4's error middleware.
 */
export function safeAsyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}