import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-black/20 backdrop-blur-md border-t border-white/10 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-center items-center">
        <div
          className="
            inline-flex items-center gap-3
            px-6 py-1.5
            rounded-full
            border border-yellow-400/60
            bg-yellow-400/20
            text-sm tracking-widest
            font-orbitron text-yellow-200
            backdrop-blur-sm
            shadow-inner
          "
        >
          <p>MADE BY SHIVAGYA AND SIDHANT</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
