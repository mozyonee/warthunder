import "./globals.css";

const RootLayout = ({ children }) => {
	return (
		<html lang="en">
			<body className='bg-gray-950'>{children}</body>
		</html>
	);
}
  
export default RootLayout;