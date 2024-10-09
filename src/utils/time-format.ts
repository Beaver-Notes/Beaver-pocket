export function formatTime(
  time: number | string | Date | null | undefined,
  format: string = "YY-MM-DD hh:mm:ss"
): string {
  if (!time) {
    return "";
  }

  let date: Date;

  if (typeof time === "number") {
    date = new Date(time);
  } else if (typeof time === "string") {
    if (/^\d+$/g.test(time)) {
      date = new Date(+time);
    } else {
      date = new Date(time);
    }
  } else {
    date = time;
  }

  const map: { [key: string]: number } = {
    M: date.getMonth() + 1,
    D: date.getDate(),
    h: date.getHours(),
    m: date.getMinutes(),
    s: date.getSeconds(),
  };

  return format.replace(
    /([YMDhms])+/g,
    function (w: string, t: string): string {
      const v = map[t];
      if (v !== undefined) {
        if (w.length > 1) {
          return ("0" + v).slice(-2);
        }
        return v.toString();
      } else if (t === "Y") {
        return (date.getFullYear() + "").slice(-w.length);
      }
      return w;
    }
  );
}
