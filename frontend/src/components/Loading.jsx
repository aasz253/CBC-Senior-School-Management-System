const Loading = ({ fullScreen = true }) => (
  <div className={`${fullScreen ? 'min-h-screen' : 'h-64'} flex items-center justify-center`}>
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

export default Loading;
