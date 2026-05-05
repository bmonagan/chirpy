export function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const status = res.statusCode;
    if (status >= 400) {
        
        console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${status}`);
    }
  })
  next();
}

export function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
    res.on("finish" , () => { 
        chirpyConfig.fileserverHits += 1;
    })
    next();
}

export async function validateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedBody = req.body.body;
    if (parsedBody.length > 140) {
      throw Error
    }
    const bodyClean: BodyClean = filterProfanity(parsedBody);
    return res.status(200).send({ "cleanedBody": bodyClean.body });
  } catch (err) {
    next(err);
  }
}

export function errorHandler(
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error("Error occured");
  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : "Something went wrong on our end";
  res.status(statusCode).json({
    error: message,
  });
}