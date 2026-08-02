// Temporary test switch of the Personal Video Greeting section only.
//
// While this is on, the section shows its prices exactly as before, but no
// credits are taken, reserved or held, and an empty balance never blocks the
// start of a starting scene. Switching it back to false restores the normal
// single payment (one credit per person, five starting scenes included)
// without any other change to the page.
// Turned off now that the developer test credit system is in place: test
// credits behave exactly like purchased ones, so the section runs the normal
// single payment and the normal refunds.
export const PERSONAL_VIDEO_GREETING_TEST_MODE = false;
