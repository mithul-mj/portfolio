import React from 'react';
import styles from './div2.module.css';

function Div2() {
  return (
    <div className={styles['outer-container']}>
      <div className={`${styles['content-div']} ${styles['mid-div']}`}>
        <div className={`${styles['image-div']}`}></div>
      </div>
      <div className={`${styles['content-div']} ${styles['top-content']}`}>
        <span className={styles.aboutme}>-- ABOUT ME</span><br />
        <span className={styles.whoami}>Who Am I</span>
      </div>
      <div className={`${styles['content-div']} ${styles['bottom-content']}`}>
      Motivated and detail-oriented Computer Engineering diploma student with a strong foundation in
programming, software development, and problem-solving. Seeking an opportunity to apply my
skills and contribute to innovative software solutions at a forward-thinking company. 

      </div>
    </div>
  );
}

export default Div2;
