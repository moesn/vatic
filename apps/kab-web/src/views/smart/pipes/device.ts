export function mergeCoordinate(data: any) {
  data.coordinate = [data.longitude, data.latitude];
}

export function separateCoordinate(body: any) {
  body.longitude = body.coordinate[0];
  body.latitude = body.coordinate[1];
}
