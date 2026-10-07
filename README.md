# ARVISTA — AR Object Animator

ARVISTA is a GitHub Pages-friendly WebAR prototype that uses a phone/laptop camera and browser-based AI object detection to add animated AR-style effects to recognized objects.

## What this version does

- Opens the device camera in the browser.
- Uses TensorFlow.js + COCO-SSD to recognize common objects.
- Draws animated effects around detected objects.
- Provides a mobile-first interface.
- Works as a static site: no backend or server is required.
- Can be hosted directly with GitHub Pages.

## Important limitation

This first version does **not** perform full spatial AR tracking like ARKit/ARCore. The animation follows the detected object's 2D bounding box in the camera view.

The AI model can recognize a defined set of common categories. It cannot reliably recognize literally every object in the world.

## Supported examples

The effect library includes special effects for:
- person
- book
- laptop
- cell phone
- bottle
- cup
- apple
- banana
- backpack
- bicycle
- car
- chair
- TV
- keyboard
- mouse
- clock
- vase
- dog
- cat
- bird

Unknown recognized objects still receive the generic Holo Highlight effect.

## Run locally

Because browsers restrict camera access on insecure pages, use HTTPS or localhost.

The easiest option is to publish with GitHub Pages.

## Publish on GitHub Pages

1. Create a new repository, for example `ARVISTA`.
2. Upload:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Save.
6. Open the generated HTTPS GitHub Pages URL on your phone.
7. Allow camera permission.

## Project flow

Camera → AI object detection → detected class → effect library → animated canvas overlay.

## Future upgrade

For a more advanced exhibition version, add:
- marker/image tracking
- true 3D `.glb` models
- WebXR / ARCore / ARKit support where available
- custom trained object recognition
- QR-triggered experiences
- object-specific sound
- multiple animations
- a CMS or JSON file for adding new object experiences
