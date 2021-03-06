import { RandomStream } from "./libs/random";

//function randomutilMain(_util: TogetherJSNS.Util, RandomStream: RandomStreamModule) {

export class Randomizer {
    private stream;

    private lower = "abcdefghijklmnopqrstuvwxyz";
    private upper = this.lower.toUpperCase();
    private numberCharacters = "0123456789";
    private whitespace = " \t\n";
    private punctuation = "~`!@#$%^&*()_-+={}[]|\\;:'\"<>,./?";
    private defaultChars = this.lower + this.upper + this.numberCharacters + this.whitespace + this.punctuation;

    constructor(seed: number) {
        this.stream = RandomStream(seed);
    }

    number(max: number) {
        return Math.floor(this.stream() * max);
    }

    pick<T>(seq: T[]): T {
        return seq[this.number(seq.length)];
    }

    pickDist(items: number[]) {
        let total = 0;
        for(const a in items) {
            if(!Object.prototype.hasOwnProperty.call(items, a)) {
                continue;
            }
            if(typeof items[a] != "number") {
                throw "Bad property: " + a + " not a number";
            }
            total += items[a];
        }
        let num = this.number(total);
        let last;
        for(const a in items) {
            if(!Object.prototype.hasOwnProperty.call(items, a)) {
                continue;
            }
            last = a;
            if(num < items[a]) {
                return a;
            }
            num -= items[a];
        }
        // FIXME: not sure if this should ever h
        return last;
    }

    string(len: number, chars?: string) {
        let s = "";
        for(let i = 0; i < len; i++) {
            s += this.character(chars);
        }
        return s;
    }

    character(chars?: string) {
        chars = chars || this.defaultChars;
        return chars.charAt(this.number(chars.length));
    }
}

export const randomutil = (seed: number) => new Randomizer(seed);

//define(["util", "whrandom"], randomutilMain);
