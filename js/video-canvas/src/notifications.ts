const $container = document.createElement("div");
$container.id = "notifications";
$container.className = "hidden";
document.body.appendChild($container);

let dismissTimer: ReturnType<typeof setTimeout> | undefined;

export function showNotification(message: string, type: "error" | "info" | "success" = "info", duration = 5000) {
	clearTimeout(dismissTimer);

	$container.textContent = message;
	$container.className = `notification notification-${type}`;

	if (duration > 0) {
		dismissTimer = setTimeout(() => {
			$container.classList.add("notification-hiding");
			setTimeout(() => { $container.className = "hidden"; }, 300);
		}, duration);
	}
}

export function dismissNotification() {
	clearTimeout(dismissTimer);
	$container.classList.add("notification-hiding");
	setTimeout(() => { $container.className = "hidden"; }, 300);
}
