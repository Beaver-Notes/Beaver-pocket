function debounce<Args extends unknown[]>(
    fn: (...args: Args) => void,
    delay: number
) {
    let TimeoutID: number | undefined;

    const debounced = (...args: Args) => {
        clearTimeout(TimeoutID);
        TimeoutID = window.setTimeout(() => fn(...args), delay);
    };
    return debounced;
}

export default debounce;