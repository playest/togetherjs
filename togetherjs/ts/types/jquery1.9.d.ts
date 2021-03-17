interface JQueryStatic {
    browser : { mobile: boolean };
    msie: boolean;
}

// Plugins introduced by TogetherJS
interface JQuery {
    browser : { mobile: boolean };
    rotateCursorDown: () => void;
    popinWindow: () => void;
    slideIn: () => void;
    easeTo: () => void;
    animateDockEntry: () => void;
    animateDockExit: () => void;
    animateCursorEntry: () => void;
    animateKeyboard: () => void;
    stopKeyboardAnimation: () => void;
}