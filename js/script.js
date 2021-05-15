class App {

    desiredContrast = 4.5
    // Contrast level AA = 4.5, Level AAA = 7
    // Reference: https://www.w3.org/WAI/WCAG21/quickref/?versions=2.0&showtechniques=143#qr-visual-audio-contrast-contrast
  
    state = {
      textColor: {r:255, g:255, b:255},
      overlayColor: {r:0, g:0, b:0},
    }
  
    elements = {
      uploader: document.getElementById('uploader'),
      optimal_opacity_output_container: document.getElementById('optimal_opacity_output_container'),
      image_canvas: document.getElementById('image_canvas'),
      overlay: document.getElementById('overlay'),
      custom_img_btn: document.getElementById('custom_img_btn'),
      foreground_text_input: document.getElementById('foreground_text_input'),
      foreground_text: document.querySelectorAll('.foreground_text'),
      sample_image_buttons: document.querySelectorAll('.sample_img_btn'),
      background_images: document.querySelectorAll('.js_bg_image'),
  
      text_color_input: document.getElementById('text_color_input'),
      overlay_color_input: document.getElementById('overlay_color_input'),
  
      text_color_preview: document.getElementById('text_color_preview'),
      overlay_color_preview: document.getElementById('overlay_color_preview'),
  
      no_solution: document.getElementById('no_solution'),
  
      original_image: document.getElementById('original_image'),
    }
  
    start() {
      this.attachUploader();
      this.attachTextUpdaters();
      this.storeColorsFromInputs();
      this.updateTextColor(this.state.textColor);
      this.attachOverlayUpdater();
      this.prepareSampleImages();
      this.attachColorChangeListeners();
    }
  
    attachTextUpdaters() {
      this.elements.foreground_text_input.addEventListener('keyup', () => {
        this.updateText(this.elements.foreground_text_input);
      });
      this.updateText(this.elements.foreground_text_input);
    }
  
    attachOverlayUpdater() {
      this.elements.original_image.addEventListener('load', () => {this.updateOverlay()});
    }
  
    prepareSampleImages() {
      const { sample_image_buttons } = this.elements;
      const firstImageUrl = sample_image_buttons[0].getAttribute('data-url');
      this.loadImage(firstImageUrl);
      sample_image_buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const url = btn.getAttribute('data-url');
          this.loadImage(url);
        });
      });
    }
  
    attachColorChangeListeners() {
      document.querySelectorAll('input[type=color]').forEach((colorInput) => {
        colorInput.addEventListener('input', () => {
          this.storeColorsFromInputs();
          this.updateTextColor(this.state.textColor);
          this.updateOverlay();
        });
      });
    }
  
    attachUploader() {
      const { uploader } = this.elements;
      uploader.addEventListener('change', () => {
        const file = uploader.files[0];
  
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target.result;
          this.loadImage(url);
          this.updateCustomImgBtn(url);
        };
        reader.readAsDataURL(file);
      });
    }
  
    updateCustomImgBtn(url) {
      this.elements.custom_img_btn.classList.remove('hide');
      this.elements.custom_img_btn.setAttribute('data-url', url);
    }
  
    updateText(textInput) {
      this.elements.foreground_text.forEach((textBox) => {
        textBox.innerText = textInput.value || textInput.placeholder;
      });
    }
  
    updateTextColor(color) {
      this.elements.foreground_text.forEach((textBox) => {
        textBox.style.color = `rgb(
          ${color.r},
          ${color.g},
          ${color.b}
        )`;
      });
    }
  
    loadImage(url) {
      this.elements.background_images.forEach( (image) => {
        image.src = url;
      });
    }
  
    updateOverlay() {
      const { image_canvas, original_image } = this.elements;
      const { textColor, overlayColor } = this.state;
  
      const imagePixelColors = this.getImagePixelColorsUsingCanvas(original_image, image_canvas);
  
      const worstContrastColorInImage = this.getWorstContrastColorInImage(textColor, imagePixelColors);
  
      const optimalOpacity = this.findOptimalOverlayOpacity(textColor, overlayColor, worstContrastColorInImage, this.desiredContrast);
  
      this.showOptimalOpacity(optimalOpacity);
    }
  
    getImagePixelColorsUsingCanvas(image, canvas) {
      const ctx = canvas.getContext('2d');
  
      canvas.height = this.getCanvasHeightToMatchImageProportions(canvas, image);
  
      const sourceImageCoordinates = [0, 0, image.width, image.height];
      const destinationCanvasCoordinates = [0, 0, canvas.width, canvas.height];
  
      ctx.drawImage(
        image,
        ...sourceImageCoordinates,
        ...destinationCanvasCoordinates
      );
  
      // Remember getImageData only works for same-origin or cross-origin-enabled images.
      // See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more info.
      const imagePixelColors = ctx.getImageData(...destinationCanvasCoordinates);
  
      return imagePixelColors;
    }
  
    getCanvasHeightToMatchImageProportions(canvas, image) {
      return (image.height / image.width) * canvas.width;
    }
  
    showOptimalOpacity(optimalOpacity) {
      const { overlay, optimal_opacity_output_container } = this.elements;
  
      optimal_opacity_output_container.innerHTML = optimalOpacity.toFixed(3);
      overlay.style.backgroundColor = `rgb(
        ${this.state.overlayColor.r},
        ${this.state.overlayColor.g},
        ${this.state.overlayColor.b}
      )`;
      this.elements.overlay.style.opacity = optimalOpacity;
    }
  
    getWorstContrastColorInImage(textColor, imagePixelColors) {
  
      let worstContrastColorInImage;
      let worstContrast = Infinity;
  
      for (let i = 0; i < imagePixelColors.data.length; i += 4) {
        let pixelColor = {
          r: imagePixelColors.data[i],
          g: imagePixelColors.data[i + 1],
          b: imagePixelColors.data[i + 2],
        };
  
        let contrast = this.getContrast(textColor, pixelColor);
  
        if(contrast < worstContrast) {
          worstContrast = contrast;
          worstContrastColorInImage = pixelColor;
        }
      }
  
      return worstContrastColorInImage;
    }
  
    getContrast(color1, color2) {
      const color1_luminance = this.getLuminance(color1);
      const color2_luminance = this.getLuminance(color2);
  
      const lighterColorLuminance = Math.max(color1_luminance, color2_luminance);
      const darkerColorLuminance = Math.min(color1_luminance, color2_luminance);
  
      const contrast = (lighterColorLuminance + 0.05) / (darkerColorLuminance + 0.05);
      return contrast;
    }
  
    getLuminance({r,g,b}) {
      return (0.2126 * this.getLinearRGB(r) + 0.7152 * this.getLinearRGB(g) + 0.0722 * this.getLinearRGB(b));
    }
  
    getLinearRGB(primaryColor_8bit) {
      // First convert from 8-bit rbg (0-255) to standard RGB (0-1)
      const primaryColor_sRGB = this.convert_8bit_RGB_to_standard_RGB(primaryColor_8bit);
  
      // Then convert from sRGB to linear RGB so we can use it to calculate luminance
      const primaryColor_RGB_linear = this.convert_standard_RGB_to_linear_RGB(primaryColor_sRGB);
  
      return primaryColor_RGB_linear;
    }
  
    convert_8bit_RGB_to_standard_RGB(primaryColor_8bit) {
      return primaryColor_8bit / 255;
    }
  
    convert_standard_RGB_to_linear_RGB(primaryColor_sRGB) {
      const primaryColor_linear = primaryColor_sRGB < 0.03928 ?
        primaryColor_sRGB/12.92 :
        Math.pow((primaryColor_sRGB + 0.055) / 1.055, 2.4);
      return primaryColor_linear;
    }
  
    getTextContrastWithImagePlusOverlay({textColor, overlayColor, imagePixelColor, overlayOpacity}) {
      const colorOfImagePixelPlusOverlay = this.mixColors(imagePixelColor, overlayColor, overlayOpacity);
      const contrast = this.getContrast(this.state.textColor, colorOfImagePixelPlusOverlay);
      return contrast;
    }
  
    mixColors(baseColor, overlayColor, overlayOpacity) {
      const mixedColor = {
        r: baseColor.r + (overlayColor.r - baseColor.r) * overlayOpacity,
        g: baseColor.g + (overlayColor.g - baseColor.g) * overlayOpacity,
        b: baseColor.b + (overlayColor.b - baseColor.b) * overlayOpacity,
      }
      return mixedColor;
    }
  
    findOptimalOverlayOpacity(textColor, overlayColor, worstContrastColorInImage, desiredContrast) {
      const isOverlayNecessary = this.isOverlayNecessary(textColor, worstContrastColorInImage, desiredContrast);
      if (!isOverlayNecessary) {
        return 0;
      }
  
      const opacityGuessRange = {
        lowerBound: 0,
        midpoint: 0.5,
        upperBound: 1,
      };
  
      let numberOfGuesses = 0;
      const maxGuesses = 8;
      const opacityLimit = 0.99;
  
      while (numberOfGuesses < maxGuesses) {
        numberOfGuesses++;
        const currentGuess = opacityGuessRange.midpoint;
  
        const contrastOfGuess = this.getTextContrastWithImagePlusOverlay({
          textColor,
          overlayColor,
          imagePixelColor: worstContrastColorInImage,
          overlayOpacity: currentGuess,
        });
  
        const isGuessTooLow = contrastOfGuess < desiredContrast;
        const isGuessTooHigh = contrastOfGuess > desiredContrast;
  
        if (isGuessTooLow) {
          opacityGuessRange.lowerBound = currentGuess;
        }
        else if (isGuessTooHigh) {
          opacityGuessRange.upperBound = currentGuess;
        }
  
        const newMidpoint = ((opacityGuessRange.upperBound - opacityGuessRange.lowerBound) / 2) + opacityGuessRange.lowerBound;
        opacityGuessRange.midpoint = newMidpoint;
      }
  
      const optimalOpacity = opacityGuessRange.midpoint;
  
      if (optimalOpacity > opacityLimit) {
        this.elements.optimal_opacity_output_container.classList.add('hide');
        this.elements.no_solution.classList.remove('hide');
        return opacityLimit;
      }
  
      this.elements.optimal_opacity_output_container.classList.remove('hide');
      this.elements.no_solution.classList.add('hide');
      return optimalOpacity;
    }
  
    isOverlayNecessary(textColor, worstContrastColorInImage, desiredContrast) {
      const contrastWithoutOverlay = this.getContrast(textColor, worstContrastColorInImage);
      return contrastWithoutOverlay < desiredContrast;
    }
  
    convertHexToRGB(hex) {
      const raw_hex = hex.replace(/#/g, '');
      const r = parseInt(raw_hex.substring(0,2), 16);
      const g = parseInt(raw_hex.substring(2,4), 16);
      const b = parseInt(raw_hex.substring(4,6), 16);
      return {r, g, b};
    }
  
    storeColorsFromInputs() {
      this.state.textColor = this.convertHexToRGB(this.elements.text_color_input.value);
      this.state.overlayColor = this.convertHexToRGB(this.elements.overlay_color_input.value);
      this.elements.text_color_preview.style.backgroundColor = this.elements.text_color_input.value;
      this.elements.overlay_color_preview.style.backgroundColor = this.elements.overlay_color_input.value;
    }
  
  }
  
  const app = new App();
  app.start();
  
  