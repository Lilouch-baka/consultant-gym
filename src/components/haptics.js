// Light haptic feedback.
// Android/Chrome: the Vibration API. iPhone Safari has no Vibration API; on iOS 17.4+ toggling a
// native <input type="checkbox" switch> produces a system haptic tick, which is the only hook
// a web app has. If neither is available, this does nothing.
let iosSwitch = null;

function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

export function haptic(kind = 'light') {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(kind === 'error' ? [30, 40, 30] : 15);
      return;
    }
    iosTick();
    if (kind === 'error') setTimeout(iosTick, 90);
  } catch {
    // no haptics available
  }
}
