    import('./app.js').catch(() => {
      const main = document.getElementById('main');
      main.replaceChildren();
      const message = document.createElement('p');
      message.textContent = 'アプリを読み込めませんでした / Unable to load the app.';
      const retry = document.createElement('button');
      retry.textContent = '再読み込み / Reload';
      retry.addEventListener('click', () => location.reload());
      main.append(message, retry);
    });
