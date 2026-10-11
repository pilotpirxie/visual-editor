try {
  if (localStorage.getItem('ve-appearance') === 'dark') {
    document.documentElement.setAttribute('data-ve-appearance', 'dark');
  }
} catch (error) {
  console.warn('The saved appearance could not be read', error);
}
