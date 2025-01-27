import React from 'react';
import styles from './div1.module.css'; // Assuming you have your styles in a separate CSS module

function Div1() {
  // Function to handle the file download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'w.pdf'; // Make sure this is the correct path to your PDF
    link.download = 'Mithul_MJ_CV.pdf'; // File name to save as
    link.click();
  };

  return (
    <div className={styles.div1}>
      <div className={styles.textdiv}>
        <span className={styles.hello}>Hello.</span>
        <span className={styles.myname}> ---- I'am Mithul MJ</span>
        <span className={styles.description}>
          Fresher seeking job as Junior Software Developer
        </span>

        {/* Button to trigger download */}
        <button className={styles.downloadbtn} onClick={handleDownload}>
          <i className="fa-solid fa-download" style={{ color: '#ffffff' }}></i> Download CV
        </button>
      </div>

      <div className={styles.imgdiv}></div>
    </div>
  );
}

export default Div1;
