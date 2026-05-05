type BodyClean = {
    wasCleaned: boolean,
    body: string
}
const filtered = "****";
export function filterProfanity(chirp:string): BodyClean {
    let wasCleaned = false;
    let words = chirp.split(" ");
    const filterWords = ["kerfuffle", "sharbert", "fornax"];
    let body: string[] = [];
    for (const word of words) {
        const lower = word.toLowerCase();
        if (filterWords.includes(lower)) {
            wasCleaned = true;
            body.push(filtered);
        }
        else {
            body.push(word);
        }
    }
    return {wasCleaned:wasCleaned, body:body.join(" ")};

}